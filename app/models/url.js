'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var URL = new Schema({
    id: Number,
   uri: String,
   short_url: String
});

module.exports = mongoose.model('URL', URL);