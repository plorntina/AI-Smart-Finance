const mongoose = require('mongoose');

const VALID_REPORT_TYPES = ['monthly', 'spending_analysis', 'savings_tips'];

const aiReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: {
        values: VALID_REPORT_TYPES,
        message: '{VALUE} is not a valid report type',
      },
      required: [true, 'Report type is required'],
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      maxlength: [10000, 'Summary is too long'],
    },
  },
  { timestamps: true }
);

// Newest reports first
aiReportSchema.index({ userId: 1, createdAt: -1 });

aiReportSchema.statics.VALID_TYPES = VALID_REPORT_TYPES;

module.exports = mongoose.model('AIReport', aiReportSchema);
