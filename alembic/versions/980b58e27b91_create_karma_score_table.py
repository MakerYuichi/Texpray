"""create karma_score table

Revision ID: 980b58e27b91
Revises: 153b3227faf3
Create Date: 2025-05-04 22:51:29.757806

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '980b58e27b91'
down_revision: Union[str, None] = '153b3227faf3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('karma_score',
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('karma', sa.Float(), nullable=True),
    sa.Column('last_reset', sa.DateTime(timezone=True), nullable=True),
    sa.Column('previous_karma', sa.Float(), nullable=True),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index(op.f('ix_karma_score_user_id'), 'karma_score', ['user_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_karma_score_user_id'), table_name='karma_score')
    op.drop_table('karma_score')
    # ### end Alembic commands ###
