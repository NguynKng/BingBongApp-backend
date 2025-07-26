let io = null;

const setSocketInstance = (instance) => {
  io = instance
}

const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket instance not initialized');
  }
  return io;
};

module.exports = {
  setSocketInstance,
  getSocketInstance
};