'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Images = new Schema({
	term: String
},{
    timestamps: true
});

module.exports = mongoose.model('Images', Images);