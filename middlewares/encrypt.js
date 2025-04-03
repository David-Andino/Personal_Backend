const bcrypt = require('bcryptjs');

const encryptData = async (data) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(data, salt);
};

const compareData = async (data, encryptedData) => {
    return await bcrypt.compare(data, encryptedData);
};

module.exports = { encryptData, compareData };