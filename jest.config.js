module.exports = {
    preset: "jest-expo",
    testEnvironment: "node",
    transform: {
      "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
    },
    setupFiles: ["<rootDir>/jest.setup.js"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    moduleNameMapper: {
      "^@/(.*)$": "<rootDir>/$1",
    },
};
  