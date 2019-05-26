package tk.logitrack.logitrackcompanion.LogiTrack

import com.tinder.scarlet.Lifecycle
import com.tinder.scarlet.Scarlet
import com.tinder.scarlet.WebSocket
import com.tinder.scarlet.messageadapter.moshi.MoshiMessageAdapter
import com.tinder.scarlet.retry.BackoffStrategy
import com.tinder.scarlet.retry.ExponentialWithJitterBackoffStrategy
import com.tinder.scarlet.streamadapter.rxjava2.RxJava2StreamAdapterFactory
import com.tinder.scarlet.websocket.okhttp.newWebSocketFactory
import io.reactivex.Emitter
import io.reactivex.Observable
import okhttp3.OkHttpClient
import tk.logitrack.logitrackcompanion.Helpers.KillSwitchLifecycle
import java.util.concurrent.TimeUnit

object NodeAPI {
	private var mFirstConnect = true

	private lateinit var mHttpClient: OkHttpClient
	private lateinit var mScarlet: Scarlet
	private lateinit var mLifecycle: Lifecycle
	private lateinit var mBackoffStrategy: BackoffStrategy
	private lateinit var mKillSwitch: KillSwitchLifecycle
	lateinit var api: NodeAPIDefinition

	private lateinit var mWebSocketEmitter: Emitter<Event>
	private val mObservable: Observable<Event> = Observable.create {
		mWebSocketEmitter = it
	}

	private lateinit var mStartDataStreamEmitter: Emitter<StandardReply>
	private lateinit var mStopDataStreamEmitter: Emitter<StandardReply>
	private lateinit var mDataStreamTickEmitter: Emitter<StandardReply>
	private lateinit var mMQTTForwardEmitter: Emitter<StandardReply>
	private lateinit var mMQTTStartEmitter: Emitter<StandardReply>
	private lateinit var mMQTTStopEmitter: Emitter<StandardReply>
	private lateinit var mGetGPSEmitter: Emitter<StandardReply>
	private val mStartDataStreamObservable: Observable<StandardReply> = Observable.create {
		mStartDataStreamEmitter = it
	}
	private val mStopDataStreamObservable: Observable<StandardReply> = Observable.create {
		mStopDataStreamEmitter = it
	}
	private val mDataStreamTickObservable: Observable<StandardReply> = Observable.create {
		mDataStreamTickEmitter = it
	}
	private val mMQTTForwardObservable: Observable<StandardReply> = Observable.create {
		mMQTTForwardEmitter = it
	}
	private val mMQTTStartObservable: Observable<StandardReply> = Observable.create {
		mMQTTStartEmitter = it
	}
	private val mMQTTStopObservable: Observable<StandardReply> = Observable.create {
		mMQTTStopEmitter = it
	}
	private val mGetGPSObservable: Observable<StandardReply> = Observable.create {
		mGetGPSEmitter = it
	}


	init {
		setBackoffStrategy(
			ExponentialWithJitterBackoffStrategy(
				5000,
				5000
			)
		)
	}

	fun connect(host: String, port: Int) {
		if(isInitialized())
			disconnect()
		createHTTPClient()
		createWebsocket(host, port)
		createAPI()

		api.observeWebSocketEvent()
			.subscribe { event ->
				when(event) {
					is WebSocket.Event.OnConnectionOpened<*> -> onConnectionOpened()
					is WebSocket.Event.OnConnectionClosed -> mWebSocketEmitter.onNext(Event.Disconnected)
					is WebSocket.Event.OnConnectionFailed -> mWebSocketEmitter.onNext(Event.Disconnected)
				}
			}

		api.observeReply()
			.subscribe {
				when(it.type) {
					"start-data-stream" -> onStartDataStream(it)
					"stop-data-stream" -> onStopDataStream(it)
					"data-stream-tick" -> onDataStreamTick(it)
					"mqtt-forward" -> onMQTTForward(it)
					"mqtt-start" -> onMQTTStart(it)
					"mqtt-stop" -> onMQTTStop(it)
					"get-gps" -> onGetGPS(it)
				}
			}
	}

	fun disconnect() {
		if(::mKillSwitch.isInitialized)
			mKillSwitch.kill()
	}

	fun onConnectionOpened() {
		if(mFirstConnect) {
			mFirstConnect = false
			mWebSocketEmitter.onNext(Event.Initialized)
		}
		else {
			mWebSocketEmitter.onNext(Event.Connected)
		}
	}

	fun onStartDataStream(reply: StandardReply) {
		if(::mStartDataStreamEmitter.isInitialized) {
			mStartDataStreamEmitter.onNext(reply)
		}
	}

	fun onStopDataStream(reply: StandardReply) {
		if(::mStopDataStreamEmitter.isInitialized) {
			mStopDataStreamEmitter.onNext(reply)
		}
	}

	fun onDataStreamTick(reply: StandardReply) {
		if(::mDataStreamTickEmitter.isInitialized) {
			mDataStreamTickEmitter.onNext(reply)
		}
	}

	fun onMQTTForward(reply: StandardReply) {
		if(::mMQTTForwardEmitter.isInitialized) {
			mMQTTForwardEmitter.onNext(reply)
		}
	}

	fun onMQTTStart(reply: StandardReply) {
		if(::mMQTTStartEmitter.isInitialized) {
			mMQTTStartEmitter.onNext(reply)
		}
	}

	fun onMQTTStop(reply: StandardReply) {
		if(::mMQTTStopEmitter.isInitialized) {
			mMQTTStopEmitter.onNext(reply)
		}
	}

	fun onGetGPS(reply: StandardReply) {
		if(::mGetGPSEmitter.isInitialized) {
			mGetGPSEmitter.onNext(reply)
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
		mKillSwitch = KillSwitchLifecycle()

		mScarlet = Scarlet.Builder()
			.webSocketFactory(mHttpClient.newWebSocketFactory("ws://${host}:${port}"))
			.lifecycle(mLifecycle.combineWith(mKillSwitch))
			.backoffStrategy(mBackoffStrategy)
			.addMessageAdapterFactory(MoshiMessageAdapter.Factory())
			.addStreamAdapterFactory(RxJava2StreamAdapterFactory())
			.build()
	}

	private fun createAPI() {
		api = mScarlet.create()
	}

	fun observeWebSocket(): Observable<Event> {
		return mObservable
	}

	fun observeStartDataStream(): Observable<StandardReply> {
		return mStartDataStreamObservable
	}

	fun observeStopDataStream(): Observable<StandardReply> {
		return mStopDataStreamObservable
	}

	fun observeDataStreamTick(): Observable<StandardReply> {
		return mDataStreamTickObservable
	}

	fun observeMQTTForward(): Observable<StandardReply> {
		return mMQTTForwardObservable
	}

	fun observeMQTTStart(): Observable<StandardReply> {
		return mMQTTStartObservable
	}

	fun observeMQTTStop(): Observable<StandardReply> {
		return mMQTTStopObservable
	}

	fun observeGetGPS(): Observable<StandardReply> {
		return mGetGPSObservable
	}

	enum class Event {
		Initialized,
		Connected,
		Disconnected
	}
}