'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('reports').catch(() => null);
    if (!table) return;
    if (!table.studentId) {
      await queryInterface.addColumn('reports', 'studentId', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
    // add index
    const indexes = await queryInterface.showIndex('reports').catch(() => []);
    const hasIndex = indexes.some((ix) => ix.name === 'idx_reports_studentId');
    if (!hasIndex) {
      await queryInterface.addIndex('reports', ['studentId'], { name: 'idx_reports_studentId' });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('reports').catch(() => null);
    if (!table) return;
    const indexes = await queryInterface.showIndex('reports').catch(() => []);
    const hasIndex = indexes.some((ix) => ix.name === 'idx_reports_studentId');
    if (hasIndex) {
      await queryInterface.removeIndex('reports', 'idx_reports_studentId');
    }
    if (table.studentId) {
      await queryInterface.removeColumn('reports', 'studentId');
    }
  }
};
