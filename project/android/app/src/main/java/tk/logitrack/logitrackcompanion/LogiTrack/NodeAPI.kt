package tk.logitrack.logitrackcompanion.LogiTrack

import com.tinder.scarlet.Lifecycle
import com.tinder.scarlet.Scarlet
import com.tinder.scarlet.WebSocket
import com.tinder.scarlet.messageadapter.moshi.MoshiMessageAdapter
import com.tinder.scarlet.retry.BackoffStrategy
import com.tinder.scarlet.retry.ExponentialWithJitterBackoffStrategy
import com.tinder.scarlet.streamadapter.rxjava2.RxJava2StreamAdapterFactory
import com.tinder.scarlet.websocket.okhttp.newWebSocketFactory
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

object NodeAPI {
	private lateinit var mHttpClient: OkHttpClient
	private lateinit var mScarlet: Scarlet
	private lateinit var mLifecycle: Lifecycle
	private lateinit var mBackoffStrategy: BackoffStrategy
	lateinit var api: NodeAPIDefinition
	var isConnected: Boolean = false

	init {
		setBackoffStrategy(
			ExponentialWithJitterBackoffStrategy(
				5000,
				5000
			)
		)
	}

	fun connect(host: String, port: Int) {
		createHTTPClient()
		createWebsocket(host, port)
		createAPI()

		val disposable = api.observeWebSocketEvent()
			.subscribe {
				event ->
					if(event is WebSocket.Event.OnConnectionOpened<*>)
						isConnected = true
					else if(event is WebSocket.Event.OnConnectionClosed) {
						isConnected = false
					}
			}
	}

	fun setBackoffStrategy(backoffStrategy: BackoffStrategy) {
		mBackoffStrategy = backoffStrategy
	}

	fun setLifecycle(lifecycle: Lifecycle) {
		mLifecycle = lifecycle
	}

	fun isInitialized(): Boolean {
		return  NodeAPI::mHttpClient.isInitialized &&
				NodeAPI::mScarlet.isInitialized &&
				NodeAPI::mLifecycle.isInitialized &&
				NodeAPI::mBackoffStrategy.isInitialized &&
				NodeAPI::api.isInitialized
	}

	private fun createHTTPClient() {
		mHttpClient = OkHttpClient.Builder()
			.connectTimeout(10, TimeUnit.SECONDS)
			.readTimeout(10, TimeUnit.SECONDS)
			.writeTimeout(10, TimeUnit.SECONDS)
			.build()
	}

	private fun createWebsocket(host: String, port: Int) {
		mScarlet = Scarlet.Builder()
			.webSocketFactory(mHttpClient.newWebSocketFactory("ws://${host}:${port}"))
			.lifecycle(mLifecycle)
			.backoffStrategy(mBackoffStrategy)
			.addMessageAdapterFactory(MoshiMessageAdapter.Factory())
			.addStreamAdapterFactory(RxJava2StreamAdapterFactory())
			.build()
	}

	private fun createAPI() {
		api = mScarlet.create()
	}
}