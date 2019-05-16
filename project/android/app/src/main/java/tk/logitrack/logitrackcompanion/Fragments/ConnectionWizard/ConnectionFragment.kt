package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

import android.content.Context
import android.content.Context.WIFI_SERVICE
import android.content.SharedPreferences
import android.net.ConnectivityManager
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiManager
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.fragment.app.FragmentActivity
import androidx.viewpager.widget.ViewPager
import com.afollestad.viewpagerdots.DotsIndicator
import com.tinder.scarlet.WebSocket
import io.reactivex.Observable
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import org.jetbrains.anko.defaultSharedPreferences
import tk.logitrack.logitrackcompanion.Data.LoginData
import tk.logitrack.logitrackcompanion.Data.NodeData
import tk.logitrack.logitrackcompanion.Data.UserData
import tk.logitrack.logitrackcompanion.Fragments.LongLifeFragment
import tk.logitrack.logitrackcompanion.LogiTrack.NodeAPI
import tk.logitrack.logitrackcompanion.LogiTrack.WebAPI
import tk.logitrack.logitrackcompanion.R
import tk.logitrack.logitrackcompanion.R.layout
import tk.logitrack.logitrackcompanion.ServiceScanner
import tk.logitrack.logitrackcompanion.Services.WiFiListener


class ConnectionFragment : LongLifeFragment(), WizardFragmentListener {
	private lateinit var parentContext: FragmentActivity
	private lateinit var adapter: ConnectionWizardAdapter

	private lateinit var scanner: ServiceScanner
	private lateinit var webAPI: WebAPI
	private var listener: WizardFragmentListener? = null

	private var loginData: LoginData? = null
	private var userData: UserData? = null
	private var nodeData: NodeData? = null
	private var autoConnect: Boolean = false

	private lateinit var viewPager: ViewPager

	private lateinit var topWrapper: ConstraintLayout
	private lateinit var topFill: View
	private lateinit var username: TextView
	private lateinit var userImage: ImageView

	private lateinit var lastFragment: WizardFragment

	private lateinit var wifiObserver: Observable<String>
	private val disabledNetworks: MutableList<Int> = ArrayList()
	private var lastSSID: String = ""

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(layout.fragment_connection, container, false)
	}

	override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		topWrapper = view.findViewById(R.id.connection_top_wrapper)
		topFill = view.findViewById(R.id.top_fill)
		username = view.findViewById(R.id.user_name)
		userImage = view.findViewById(R.id.user_image)

		viewPager = view.findViewById(R.id.connection_wizard)
		if(!::adapter.isInitialized) {
			adapter = ConnectionWizardAdapter(
				parentContext.supportFragmentManager,
				this
			)
		}
		lastFragment = adapter.getLoginFragment()

		viewPager.adapter = adapter
		viewPager.currentItem = 0
		val dotsIndicator = view.findViewById<DotsIndicator>(R.id.dots_indicator)
		dotsIndicator.attachViewPager(viewPager)

		viewPager.addOnPageChangeListener(object: ViewPager.OnPageChangeListener {
			override fun onPageScrollStateChanged(state: Int) {

			}

			override fun onPageScrolled(position: Int, positionOffset: Float, positionOffsetPixels: Int) {

			}

			override fun onPageSelected(position: Int) {
				(adapter.getItem(position) as WizardFragment).onFragmentActive()
				lastFragment.onFragmentNonActive()

				if(position == 1) {
					adapter.getWifiFragment().setCurrentWiFi(getCurrentSSID())
				}
			}
		})

		syncTopBar()
		checkStep()
	}

	override fun onActivityCreated(savedInstanceState: Bundle?) {
		super.onActivityCreated(savedInstanceState)

		webAPI = WebAPI.create()
	}

	override fun onFragmentActive() {

	}

	override fun onFragmentNonActive() {
	}

	override fun onLogin(token: String, id: String) {
		loginData = LoginData(token, id)

		if(::parentContext.isInitialized)
			saveLoginData(parentContext.defaultSharedPreferences)

		webAPI.getUser(id)
			.subscribeOn(Schedulers.io())
			.observeOn(AndroidSchedulers.mainThread())
			.subscribe({
				result: UserData ->
					onUserData(result)
			}, {
				error ->
					Log.e(this.javaClass.canonicalName, error.toString())
			})

		webAPI.getNode(id)
			.subscribeOn(Schedulers.io())
			.observeOn(AndroidSchedulers.mainThread())
			.subscribe({
				result: NodeData ->
					onNodeData(result)
			}, {
				error ->
					Log.e(this.javaClass.canonicalName, error.toString())
			})
	}

	override fun onLogout() {

	}

	private fun onUserData(data: UserData) {
		this.userData = data

		syncTopBar()
		syncLoginFragment()

		if(::parentContext.isInitialized)
			saveUserData(parentContext.defaultSharedPreferences)

		checkStep()
	}

	private fun onNodeData(data: NodeData) {
		nodeData = data

		adapter.getLoginFragment().setRequestNode(true)
		adapter.getWifiFragment().setCurrentWiFi(getCurrentSSID())
		adapter.getWifiFragment().setWantedWiFi(data.ssid)

		if(::parentContext.isInitialized)
			saveWiFiData(parentContext.defaultSharedPreferences)

		checkStep()
	}

	private fun checkStep() {
		if(userData != null && nodeData != null && loginData != null) {
			if(getCurrentSSID().compareTo(nodeData!!.ssid) == 0) {
				viewPager.currentItem = 2
				startScanner()
			}
			else {
				viewPager.currentItem = 1

				if(autoConnect) {
					connectToWiFi()
				}
			}
		}
	}

	private fun onLoginFail() {

	}

	override fun onWiFiConnect() {
		connectToWiFi()
	}

	override fun onAttach(context: Context) {
		super.onAttach(context)

		parentContext = context as FragmentActivity
		scanner = ServiceScanner(getString(R.string.service_name), getString(R.string.service_type), context)
		initSavedData()

		if(!::wifiObserver.isInitialized) {
			wifiObserver = WiFiListener.observe()
			wifiObserver
				.subscribeOn(Schedulers.io())
				.observeOn(AndroidSchedulers.mainThread())
				.subscribe {
					onWifiChange(it)
				}
		}
	}

	private fun syncViews() {
		syncTopBar()
		syncLoginFragment()
		syncWiFiFragment()
	}

	private fun syncTopBar() {
		if(userData !=  null) {
			topWrapper.visibility = View.VISIBLE
			username.text = "${userData!!.firstName} ${userData!!.lastName}"
			syncImage()
		}
		else {
			topWrapper.visibility = View.GONE
		}
	}

	private fun syncImage() {
		if(userData != null) {
			if(userData!!.profilePictureURL.compareTo("::test") != 0) {
				// TODO
			}
		}
	}

	private fun syncLoginFragment() {
		val loginFragment = adapter.getLoginFragment()
		loginFragment.setRequestImage(userData != null && userData!!.profilePictureURL.isNotEmpty())
		loginFragment.setRequestName(userData != null && userData!!.firstName.isNotEmpty())
		loginFragment.setRequestNode(nodeData != null && nodeData!!.ssid.isNotEmpty())
		loginFragment.setLoginState(loginData != null)
	}

	private fun syncWiFiFragment() {
		val wifiFragment = adapter.getWifiFragment()
		wifiFragment.setCurrentWiFi(getCurrentSSID())
		wifiFragment.setAutoConnect(autoConnect)

		if(nodeData != null && nodeData!!.ssid.isNotEmpty()) {
			wifiFragment.setWantedWiFi(nodeData!!.ssid)
		}
		else {
			wifiFragment.setWantedWiFi("Unknown")
		}
	}

	private fun initSavedData() {
		val prefs: SharedPreferences = parentContext.defaultSharedPreferences

		getSavedLoginData(prefs)
		getSavedUserData(prefs)
		getSavedWiFiData(prefs)
	}

	private fun saveLoginData(prefs: SharedPreferences) {
		if(loginData != null) {
			prefs.edit()
				.putString(getString(R.string.connection_login_token_key), loginData!!.token)
				.putString(getString(R.string.connection_login_user_id_key), loginData!!.id)
				.apply()
		}
	}

	private fun getSavedLoginData(prefs: SharedPreferences) {
		val loginToken: String = prefs.getString(getString(R.string.connection_login_token_key), "")
		val userID: String = prefs.getString(getString(R.string.connection_login_user_id_key), "")

		if(loginToken.isNotEmpty() && userID.isNotEmpty()) {
			loginData = LoginData(loginToken, userID)
		}
	}

	private fun saveUserData(prefs: SharedPreferences) {
		if(userData != null) {
			prefs.edit()
				.putString(getString(R.string.connection_user_first_name_key), userData!!.firstName)
				.putString(getString(R.string.connection_user_last_name_key), userData!!.lastName)
				.putString(getString(R.string.connection_user_user_image_key), userData!!.profilePictureURL)
				.apply()
		}
	}

	private fun getSavedUserData(prefs: SharedPreferences) {
		val firstName: String = prefs.getString(getString(R.string.connection_user_first_name_key), "")
		val lastName: String = prefs.getString(getString(R.string.connection_user_last_name_key), "")
		val image: String = prefs.getString(getString(R.string.connection_user_user_image_key), "")

		if(firstName.isNotEmpty() && lastName.isNotEmpty() && image.isNotEmpty()) {
			userData = UserData(firstName, lastName, image)
		}
	}

	private fun saveWiFiData(prefs: SharedPreferences) {
		if(nodeData != null) {
			prefs.edit()
				.putString(getString(R.string.connection_wifi_ssid_key), nodeData!!.ssid)
				.putString(getString(R.string.connection_wifi_psk_key), nodeData!!.psk)
				.putBoolean(getString(R.string.connection_wifi_auto_connect_key), autoConnect)
				.apply()
		}
	}

	private fun getSavedWiFiData(prefs: SharedPreferences) {
		val ssid: String = prefs.getString(getString(R.string.connection_wifi_ssid_key), "")
		val psk: String = prefs.getString(getString(R.string.connection_wifi_psk_key), "")
		autoConnect = prefs.getBoolean(getString(R.string.connection_wifi_auto_connect_key), false)

		if(ssid.isNotEmpty() && psk.isNotEmpty()) {
			nodeData = NodeData(ssid, psk)
		}
	}

	override fun onDetach() {
		super.onDetach()
		listener = null

		Log.d(javaClass.simpleName, "Detached")
	}



	override fun onPause() {
		super.onPause()

		reEnableNetworks()
		Log.d(javaClass.simpleName, "OnPause")
	}

	override fun onResume() {
		super.onResume()

		if(autoConnect && nodeData != null) {
			Log.d(javaClass.simpleName, "Trying to reconnect")
			if(getCurrentSSID().compareTo(nodeData!!.ssid) != 0) {
				connectToWiFi()
			}
		}
		Log.d(javaClass.simpleName, "OnResume ${autoConnect} ${nodeData.toString()}")
	}

	private fun getCurrentSSID(): String {
		var ssid = "None"

		val connManager = parentContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
		val networkInfo = connManager.getNetworkInfo(ConnectivityManager.TYPE_WIFI)
		if (networkInfo.isConnected) {
			val wifiManager = context!!.getSystemService(Context.WIFI_SERVICE) as WifiManager
			val connectionInfo = wifiManager.connectionInfo
			if (connectionInfo != null && connectionInfo.ssid.isNotEmpty()) {
				ssid = connectionInfo.ssid
				ssid = ssid.removeRange(0, 1)
				ssid = ssid.removeRange(ssid.length - 1, ssid.length)
			}
		}
		return ssid
	}

	fun startScanner() {
		Log.d(javaClass.simpleName, "Starting Scanner")
		scanner.search {
				host: String, port: Int ->
			onServiceFound(host, port)
		}
	}

	fun onServiceFound(host: String, port: Int) {
		adapter.getWebsocketFragment().setDeviceFound(true)

		Log.d(javaClass.simpleName, "Connecting to ${host}:${port}")
		NodeAPI.connect(host, port)
		NodeAPI.api.observeWebSocketEvent()
			.subscribeOn(Schedulers.io())
			.observeOn(AndroidSchedulers.mainThread())
			.filter {
				event: WebSocket.Event ->
					!(event is WebSocket.Event.OnMessageReceived)
			}
			.subscribe { event ->
				when (event) {
					is WebSocket.Event.OnConnectionOpened<*> -> onSocketOpened()
					is WebSocket.Event.OnConnectionClosed -> onSocketClosed()
					is WebSocket.Event.OnConnectionFailed -> onSocketFailed()
				}
			}

		if(NodeAPI.isInitialized()) {
			onSocketOpened()
		}
	}

	private fun onSocketOpened() {
		adapter.getWebsocketFragment().setDeviceConnected(true)
		scanner.stop()
	}

	private fun onSocketClosed() {
		adapter.getWebsocketFragment().setDeviceConnected(false)
	}

	private fun onSocketFailed() {
		adapter.getWebsocketFragment().setDeviceConnected(false)
	}

	override fun onAutoConnectChange(value: Boolean) {
		autoConnect = value

		if(::parentContext.isInitialized)
			saveWiFiData(parentContext.defaultSharedPreferences)
	}

	private fun connectToWiFi() {
		val config = WifiConfiguration()
		config.SSID = "\"${nodeData!!.ssid}\""
		config.preSharedKey = "\"${nodeData!!.psk}\""
		Log.d(javaClass.simpleName, "Connecting to ${config.SSID} with ${config.preSharedKey}")

		if(context != null) {
			val manager: WifiManager = context!!.getSystemService(WIFI_SERVICE) as WifiManager
			var id = manager.addNetwork(config)

			//manager.disconnect()
			if(id == -1) {
				val list = manager.configuredNetworks
				for (i in list) {
					if (i.SSID != null && i.SSID.compareTo(config.SSID) == 0) {
						id = i.networkId
					}
					else {
						manager.disableNetwork(i.networkId)
						disabledNetworks.add(i.networkId)
					}
				}
			}
			if(id != -1) {
				manager.enableNetwork(id, true)
			}
			manager.saveConfiguration()
			//manager.reconnect()
		}
	}

	private fun reEnableNetworks() {
		if(context == null)
			return

		Log.d(javaClass.simpleName, "Re-enabling networks.")

		val manager: WifiManager = context!!.getSystemService(WIFI_SERVICE) as WifiManager

		//manager.disconnect()
		for(networkId in disabledNetworks) {
			manager.enableNetwork(networkId, false)
		}
		//manager.reconnect()
		manager.saveConfiguration()
		disabledNetworks.clear()
	}

	private fun onWifiChange(ssid: String) {
		if(view != null && ssid.compareTo(lastSSID) != 0) {
			NodeAPI.disconnect()
			adapter.getWifiFragment().setCurrentWiFi(ssid)
			checkStep()
		}
		if(autoConnect && !ssid.toLowerCase().contains("none") && nodeData != null && ssid.compareTo(nodeData!!.ssid) != 0) {
			Log.d(javaClass.simpleName, "Reconnecting.")
			connectToWiFi()
		}

		lastSSID = ssid
	}

	override fun onLoginReady() {
		syncLoginFragment()
	}

	override fun onWiFiReady() {
		syncWiFiFragment()
	}

	override fun onWebSocketReady() {

	}

	override fun onHotspotReady() {

	}

	companion object {
		@JvmStatic
		fun newInstance() =
			ConnectionFragment().apply {

			}
	}
}
