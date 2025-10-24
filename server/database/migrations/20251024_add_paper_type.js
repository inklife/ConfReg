/**
 * Migration: Add paper_type column to backend_registrationsubmission table
 * Created: 2025-10-24
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add paper_type column
    await queryInterface.addColumn('backend_registrationsubmission', 'paper_type', {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: 'research'
    });

    console.log('✓ Added paper_type column to backend_registrationsubmission table');
  },

  async down(queryInterface, Sequelize) {
    // Remove paper_type column
    await queryInterface.removeColumn('backend_registrationsubmission', 'paper_type');
    
    console.log('✓ Removed paper_type column from backend_registrationsubmission table');
  }
};
