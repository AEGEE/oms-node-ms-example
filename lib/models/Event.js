const mongoose = require('mongoose');

// A participant applying to an event including it's application
const paxSchema = mongoose.Schema({
  board_comment: String,
  foreign_id: { type: String, required: true }, // ID in oms-core
  application_status: {
    type: String,
    enum: ['requesting', 'pending', 'accepted', 'rejected'],
    default: 'requesting',
  },
  application:
  [
    {
      field_id: { type: String, required: true },
      value: String,
    },
  ],
}, { timestamps: true });


const applicationFieldSchema = mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  optional: { type: Boolean, default: false },

  // TODO Add validation, like
  //type: {type: String, enum: ['String', 'Number'], default: 'String'},
  //min_length: Number
});

const eventSchema = mongoose.Schema({
  foreign_id: String,
  application_fields: [applicationFieldSchema],
  applications: [paxSchema],
});

module.exports = mongoose.model('Event', eventSchema);
