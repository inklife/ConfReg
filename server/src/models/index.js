const { sequelize } = require('../config/database');
const User = require('./User');
const RegistrationSubmission = require('./RegistrationSubmission');
const AttendeeTransfer = require('./AttendeeTransfer');
const RefundRequest = require('./RefundRequest');
const InvoiceRequest = require('./InvoiceRequest');
const InvoiceFile = require('./InvoiceFile');

// 定义关联关系
RegistrationSubmission.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

RegistrationSubmission.belongsTo(User, {
  foreignKey: 'reviewed_by',
  as: 'reviewer'
});

User.hasMany(RegistrationSubmission, {
  foreignKey: 'userId',
  as: 'submissions'
});

User.hasMany(RegistrationSubmission, {
  foreignKey: 'reviewed_by',
  as: 'reviewedSubmissions'
});

// AttendeeTransfer 关联关系
AttendeeTransfer.belongsTo(RegistrationSubmission, {
  foreignKey: 'registrationId',
  as: 'registration'
});

AttendeeTransfer.belongsTo(User, {
  foreignKey: 'requestedBy',
  as: 'requester'
});

AttendeeTransfer.belongsTo(User, {
  foreignKey: 'processedBy',
  as: 'processor'
});

RegistrationSubmission.hasMany(AttendeeTransfer, {
  foreignKey: 'registrationId',
  as: 'attendeeTransfers'
});

User.hasMany(AttendeeTransfer, {
  foreignKey: 'requestedBy',
  as: 'requestedTransfers'
});

User.hasMany(AttendeeTransfer, {
  foreignKey: 'processedBy',
  as: 'processedTransfers'
});

// RefundRequest 关联关系
RefundRequest.belongsTo(RegistrationSubmission, {
  foreignKey: 'registrationId',
  as: 'registration'
});

RefundRequest.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

RefundRequest.belongsTo(User, {
  foreignKey: 'processedBy',
  as: 'processor'
});

RegistrationSubmission.hasMany(RefundRequest, {
  foreignKey: 'registrationId',
  as: 'refundRequests'
});

User.hasMany(RefundRequest, {
  foreignKey: 'userId',
  as: 'refundRequests'
});

User.hasMany(RefundRequest, {
  foreignKey: 'processedBy',
  as: 'processedRefunds'
});

// InvoiceRequest 关联关系
InvoiceRequest.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

InvoiceRequest.belongsTo(RegistrationSubmission, {
  foreignKey: 'registrationId',
  as: 'registration'
});

User.hasMany(InvoiceRequest, {
  foreignKey: 'userId',
  as: 'invoiceRequests'
});

RegistrationSubmission.hasMany(InvoiceRequest, {
  foreignKey: 'registrationId',
  as: 'invoiceRequests'
});

// InvoiceFile 关联关系
InvoiceFile.belongsTo(InvoiceRequest, {
  foreignKey: 'invoiceRequestId',
  as: 'invoiceRequest'
});

InvoiceFile.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader'
});

InvoiceRequest.hasMany(InvoiceFile, {
  foreignKey: 'invoiceRequestId',
  as: 'files'
});

User.hasMany(InvoiceFile, {
  foreignKey: 'uploadedBy',
  as: 'uploadedInvoiceFiles'
});

module.exports = {
  sequelize,
  User,
  RegistrationSubmission,
  AttendeeTransfer,
  RefundRequest,
  InvoiceRequest,
  InvoiceFile
};
