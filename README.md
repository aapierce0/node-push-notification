# push-dispatch

`push-dispatch` is a library for sending push notifications from Node.js to users with multiple devices across multiple platforms.
Because platforms (iOS, Android, AWS SNS, etc.) require different setups, `push-dispatch` employs a transport system where helper modules are used to communicate with various push notification providers.
For example, `push-dispatch` cannot send any push notifications out of the box, but if an Android transport plugin is used, it can send push notifications to Android devices.

`push-dispatch` depends on a persistent store to track which devices belong to a user.
In-memory and flat-file data store classes are provided for ease of development and testing, but these providers are not recommended for production use.
It's strongly encouraged that you use a custom plugin for another data store (such as SQLite, MySQL, or Postgres) when deploying to production.

The plugin system is used to allow custom integrations, while keeping the dependencies of `push-dispatch` to a minimum.
