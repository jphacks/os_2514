class MessageParser {
  static parse(message) {
    try {
      return JSON.parse(message);
    } catch (error) {
      throw new Error('Invalid JSON message');
    }
  }

  static validate(data) {
    if (!data.type) {
      throw new Error('Missing message type');
    }
    if (!data.payload) {
      data.payload = {};
    }
    return data;
  }
}

module.exports = MessageParser;