import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // APNs → Firebase Messaging + Capacitor PushNotifications plugin.
    // CRITICAL: Capacitor's PushNotifications plugin listens to the
    // NotificationCenter notification `Notification.Name.capacitorDidRegisterForRemoteNotifications`
    // to emit its 'registration' event to JS. Without this post, the JS side
    // never receives the device token and /notifications/subscribe is never
    // called → push notifications silently fail.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        NotificationCenter.default.post(name: Notification.Name.capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: Notification.Name.capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // Firebase Cloud Messaging token. Called after APNs token is exchanged
    // with FCM (post `Messaging.messaging().apnsToken = ...`).
    // The Capacitor @capacitor/push-notifications plugin emits the raw APNs
    // hex token in its 'registration' event, but Firebase Admin SDK on the
    // backend rejects those — we need the FCM registration token (long
    // base64-ish string). We store it in UserDefaults under the key prefix
    // that @capacitor/preferences uses ("CapacitorStorage.") so the JS layer
    // can `Preferences.get({ key: 'fcmToken' })` and forward THAT to the
    // backend.
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        UserDefaults.standard.set(token, forKey: "CapacitorStorage.fcmToken")
        print("[push] FCM token saved (prefix=\(token.prefix(16))…)")
    }
}
