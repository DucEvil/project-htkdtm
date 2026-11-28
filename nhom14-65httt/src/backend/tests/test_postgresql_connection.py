"""Kiểm thử tích hợp kết nối PostgreSQL thật qua hạ tầng DB của ứng dụng.

Chỉ chạy khi đặt RUN_POSTGRES_TESTS=1 và PostgreSQL local (xem docker-compose.yml) đang chạy.
Chỉ dùng truy vấn đọc: không ghi dữ liệu, không đổi schema, không chạy Alembic.
Khi đã bật opt-in, cấu hình sai hoặc không kết nối được phải làm test thất bại, không skip.
"""

import os
from contextlib import contextmanager

import pytest
from sqlalchemy import text

from app import database

OPT_IN_VARIABLE = "RUN_POSTGRES_TESTS"
LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
EXPECTED_MAJOR_VERSION = 16  # Khớp image postgres:16-alpine trong docker-compose.yml

pytestmark = [
    pytest.mark.postgresql,
    pytest.mark.skipif(
        os.environ.get(OPT_IN_VARIABLE) != "1",
        reason=f"Kiểm thử PostgreSQL thật cần bật rõ ràng: đặt {OPT_IN_VARIABLE}=1",
    ),
]


def require_local_postgres():
    """Dừng test nếu engine của ứng dụng không phải PostgreSQL local; không in URL/mật khẩu."""
    engine = database.engine
    dialect = engine.dialect.name
    if dialect != "postgresql":
        pytest.fail(
            f"Đã bật {OPT_IN_VARIABLE}=1 nhưng engine ứng dụng dùng dialect '{dialect}', "
            "không phải PostgreSQL. Kiểm tra POSTGRES_* trong .env và để trống DATABASE_URL.",
            pytrace=False,
        )
    if engine.url.host not in LOCAL_HOSTS:
        pytest.fail(
            "Host PostgreSQL không thuộc localhost/127.0.0.1/::1; dừng kiểm thử để "
            "tránh chạm vào database ngoài môi trường phát triển local.",
            pytrace=False,
        )
    return engine


class SessionSpy:
    """Ghi nhận session do get_db tạo ra và số lần Session.close được gọi."""

    def __init__(self):
        self.session = None
        self.close_calls = 0


@pytest.fixture(autouse=True, scope="module")
def release_pooled_connections():
    """Đóng các kết nối còn trong pool sau module; engine dùng chung vẫn tái sử dụng được."""
    yield
    database.engine.dispose()


@pytest.fixture
def session_spy(monkeypatch):
    """Thay SessionLocal trong phạm vi một test bằng factory vẫn tạo session thật và đếm close."""
    spy = SessionSpy()
    real_factory = database.SessionLocal

    def factory():
        session = real_factory()
        original_close = session.close

        def counting_close():
            spy.close_calls += 1
            return original_close()

        session.close = counting_close
        spy.session = session
        return session

    monkeypatch.setattr(database, "SessionLocal", factory)
    return spy


def test_engine_uses_postgresql_dialect():
    engine = require_local_postgres()
    assert engine.dialect.name == "postgresql"
    assert engine.dialect.driver == "psycopg2"


def test_engine_can_connect_to_real_postgresql():
    engine = require_local_postgres()
    with engine.connect() as connection:
        assert connection.dialect.name == "postgresql"
        assert connection.closed is False
        assert connection.execute(text("SELECT 1")).scalar_one() == 1


def test_select_one_returns_exact_value():
    engine = require_local_postgres()
    with engine.connect() as connection:
        row = connection.execute(text("SELECT 1 AS value")).one()
    assert row.value == 1
    assert isinstance(row.value, int)


def test_server_version_is_postgresql_16():
    engine = require_local_postgres()
    with engine.connect() as connection:
        version_num = int(connection.execute(text("SHOW server_version_num")).scalar_one())
    assert version_num // 10000 == EXPECTED_MAJOR_VERSION


def test_session_local_can_run_read_query():
    require_local_postgres()
    with database.SessionLocal() as session:
        assert session.get_bind().dialect.name == "postgresql"
        assert session.execute(text("SELECT 1")).scalar_one() == 1


def test_get_db_yields_postgresql_session_and_closes_it(session_spy):
    require_local_postgres()
    with contextmanager(database.get_db)() as db:
        assert db is session_spy.session
        assert db.get_bind().dialect.name == "postgresql"
        assert db.execute(text("SELECT 1")).scalar_one() == 1
        assert session_spy.close_calls == 0
    assert session_spy.close_calls == 1
    assert session_spy.session.in_transaction() is False


def test_get_db_closes_session_when_request_fails(session_spy):
    require_local_postgres()
    with pytest.raises(RuntimeError, match="loi-gia-lap"):
        with contextmanager(database.get_db)() as db:
            assert db.execute(text("SELECT 1")).scalar_one() == 1
            raise RuntimeError("loi-gia-lap")
    assert session_spy.close_calls == 1
    assert session_spy.session.in_transaction() is False


def test_read_only_transaction_rollback_keeps_session_reusable():
    """Chỉ kiểm tra rollback sau truy vấn đọc; không chứng minh rollback dữ liệu ghi."""
    require_local_postgres()
    with database.SessionLocal() as session:
        assert session.execute(text("SELECT 1")).scalar_one() == 1
        assert session.in_transaction() is True
        session.rollback()
        assert session.in_transaction() is False
        assert session.execute(text("SELECT 1")).scalar_one() == 1
        assert session.in_transaction() is True
