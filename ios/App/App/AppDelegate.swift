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

    // APNs → Firebase Messaging bridge. The Capacitor PushNotifications plugin
    // already calls `application.registerForRemoteNotifications()`; we only
    // need to forward the APNs token to FCM so messaging() returns a usable
    // FCM token (which the JS side uploads to /notifications/subscribe).
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: Notification.Name(rawValue: "didFailToRegisterForRemoteNotificationsWithError"), object: error)
    }

    // FCM token rotation (e.g. reinstall, restore from backup). Currently
    // logged for debugging — when needed, post to NotificationCenter so the
    // JS side can re-subscribe.
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("[push] FCM token: \(fcmToken ?? "nil")")
    }
}
