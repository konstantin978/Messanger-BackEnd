const mongoose = require('mongoose');

const user = mongoose.Schema({
    username: String,
    password: String,
    authKey: String,
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },
    connected: {
        type: Boolean,
        default: false
    },
    followers: [],
    followings: []
});

const usersModel = mongoose.model('users', user);

module.exports = usersModel;