const log4js = require("log4js");

log4js.configure({
    appenders: {
        miLoggerConsole: { type: "console" },
        miLoggerError: { type: 'file', filename: 'error.log' },
        miLoggerWarn: { type: 'file', filename: 'warn.log' }
    },
    categories: {
        default: { appenders: ["miLoggerConsole"], level: "trace" },
        consola: { appenders: ["miLoggerConsole"], level: "info" },
        error: { appenders: ["miLoggerError"], level: "error" },
        warn: { appenders: ["miLoggerWarn"], level: "warn" }
    }
});

module.exports = log4js.getLogger('default');