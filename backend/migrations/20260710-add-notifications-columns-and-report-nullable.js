module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add notification columns if missing
    const table = 'notifications';
    const hasTable = await queryInterface.describeTable(table).catch(() => null);
    if (hasTable) {
      const cols = hasTable;
      if (!cols.type) await queryInterface.addColumn(table, 'type', { type: Sequelize.STRING, allowNull: true });
      if (!cols.data) await queryInterface.addColumn(table, 'data', { type: Sequelize.JSON, allowNull: true });
      if (!cols.read) await queryInterface.addColumn(table, 'read', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
      // add index
      try { await queryInterface.addIndex(table, ['userId'], { name: 'idx_notifications_userId' }); } catch (e) { /* ignore if exists */ }
    } else {
      // create table if not exists
      await queryInterface.createTable('notifications', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        title: { type: Sequelize.STRING, allowNull: false },
        message: { type: Sequelize.TEXT, allowNull: true },
        type: { type: Sequelize.STRING, allowNull: true },
        data: { type: Sequelize.JSON, allowNull: true },
        read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('notifications', ['userId'], { name: 'idx_notifications_userId' });
    }

    // Alter reports to allow null content and userId
    const reportTable = 'reports';
    const reportDesc = await queryInterface.describeTable(reportTable).catch(() => null);
    if (reportDesc) {
      if (reportDesc.content && reportDesc.content.allowNull === false) {
        await queryInterface.changeColumn(reportTable, 'content', { type: Sequelize.TEXT, allowNull: true });
      }
      if (reportDesc.userId && reportDesc.userId.allowNull === false) {
        await queryInterface.changeColumn(reportTable, 'userId', { type: Sequelize.INTEGER, allowNull: true });
      }
    }
  },
  down: async (queryInterface, Sequelize) => {
    // Reverse: remove added columns (dangerous if data exists)
    const table = 'notifications';
    const hasTable = await queryInterface.describeTable(table).catch(() => null);
    if (hasTable) {
      const cols = hasTable;
      if (cols.type) await queryInterface.removeColumn(table, 'type').catch(() => {});
      if (cols.data) await queryInterface.removeColumn(table, 'data').catch(() => {});
      if (cols.read) await queryInterface.removeColumn(table, 'read').catch(() => {});
      // remove index
      try { await queryInterface.removeIndex(table, 'idx_notifications_userId'); } catch (e) { /* ignore */ }
    }

    // Revert reports content/userId to NOT NULL (may fail if null values present)
    const reportTable = 'reports';
    const reportDesc = await queryInterface.describeTable(reportTable).catch(() => null);
    if (reportDesc) {
      if (reportDesc.content) await queryInterface.changeColumn(reportTable, 'content', { type: Sequelize.TEXT, allowNull: false }).catch(() => {});
      if (reportDesc.userId) await queryInterface.changeColumn(reportTable, 'userId', { type: Sequelize.INTEGER, allowNull: false }).catch(() => {});
    }
  }
};
