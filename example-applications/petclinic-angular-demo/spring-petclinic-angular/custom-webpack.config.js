const path = require('path');

module.exports = {

  resolve: {

    fallback: {
      "path": require.resolve("path-browserify") // Verwendung von path-browserify als Ersatz für das path-Modul
    }
  }
};
