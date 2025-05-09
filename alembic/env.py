from alembic import context
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from logging.config import fileConfig
import os
from dotenv import load_dotenv
from models import Base
from models.karma import dailyKarma 
from models.reflection import pendingReflection
from models.user import Users
# Update this to your model path

# Load .env variables
load_dotenv()

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
fileConfig(config.config_file_name)

# Metadata object for 'autogenerate' support
target_metadata = Base.metadata

# Use sync version of the DB URL for Alembic
DIRECT_URL = os.getenv("DIRECT_URL")
if not DIRECT_URL:
    raise ValueError("DIRECT_URL not set in .env file")

config.set_main_option("sqlalchemy.url", DIRECT_URL)

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    context.configure(
        url=DIRECT_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode using sync engine."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()



if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
