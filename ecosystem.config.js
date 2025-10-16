module.exports = {
  apps: [{
    name: "sumit-be",
    cwd: "/home/vineel/sumit-be",
    script: "npm",
    args: "start",
    env: require("dotenv").config().parsed
  }]
}
