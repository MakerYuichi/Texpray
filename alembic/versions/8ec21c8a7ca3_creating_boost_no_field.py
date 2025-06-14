"""creating boost_no field

Revision ID: 8ec21c8a7ca3
Revises: 845c795533d1
Create Date: 2025-05-05 09:54:19.132761

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ec21c8a7ca3'
down_revision: Union[str, None] = '845c795533d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('karma_score', 'boost_count',
               existing_type=sa.INTEGER(),
               nullable=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('karma_score', 'boost_count',
               existing_type=sa.INTEGER(),
               nullable=True)
    # ### end Alembic commands ###
