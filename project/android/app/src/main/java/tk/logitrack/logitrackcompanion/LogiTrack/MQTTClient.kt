package tk.logitrack.logitrackcompanion.LogiTrack

import android.content.Context
import android.util.Log
import io.reactivex.Emitter
import io.reactivex.Observable
import org.eclipse.paho.android.service.MqttAndroidClient
import org.eclipse.paho.client.mqttv3.*

object MQTTClient {
	private val mqttURL: String = "mqtts://mqtt.logitrack.tk"
	private val mqttTopic: String = ""

	private lateinit var client: MqttAndroidClient

	private lateinit var connectEmitter: Emitter<String>
	private lateinit var reconnectEmitter: Emitter<String>
	private lateinit var disconnectEmitter: Emitter<Throwable>
	private lateinit var messageEmitter: Emitter<MQTTMessage>
	private lateinit var deliveryEmitter: Emitter<IMqttDeliveryToken>

	var active: Boolean = false

	private val connectObservable: Observable<String> = Observable.create {
		connectEmitter = it
	}
	private val reconnectObservable: Observable<String> = Observable.create {
		reconnectEmitter = it
	}
	private val disconnectObservable: Observable<Throwable> = Observable.create {
		disconnectEmitter = it
	}
	private val messageObservable: Observable<MQTTMessage> = Observable.create {
		messageEmitter = it
	}
	private val deliveryObserverable: Observable<IMqttDeliveryToken> = Observable.create {
		deliveryEmitter = it
	}

	fun connect(context: Context, clientID: String, clientKey: String) {
		client = MqttAndroidClient(context, mqttURL, clientID)
		addCallbacks()

		val options = MqttConnectOptions()
		options.password = clientKey.toCharArray()
		options.isAutomaticReconnect = true
		options.isCleanSession = false

		tryConnect(options)
		active = true
	}

	fun disconnect() {
		client.disconnect()
		active = false
	}

	fun subscribe(clientID: String) {
		try {
			client.subscribe("d/" + clientID, 0, null, object: IMqttActionListener {
				override fun onSuccess(asyncActionToken: IMqttToken?) {
					Log.d(javaClass.simpleName, "MQTT subscribed to d/$clientID")
				}

				override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
					Log.d(javaClass.simpleName, "MQTT failed to subscribe to d/$clientID")
				}
			})
		}
		catch(ex: MqttException) {
			Log.e(javaClass.simpleName, ex.toString())
		}
	}

	fun unsubscribe(clientID: String) {
		client.unsubscribe("d/" + clientID)
	}

	fun isConnected(): Boolean {
		return client.isConnected
	}

	fun publish(clientID: String, input: String) {
		if(!::client.isInitialized) {
			return
		}

		try {
			val message = MqttMessage()
			message.payload = input.toByteArray()
			client.publish("u/" + clientID, message)
		}
		catch(ex: MqttException) {
			Log.e(javaClass.simpleName, ex.toString())
		}
	}

	fun observeConnect(): Observable<String> {
		return connectObservable
	}

	fun observeReconnect(): Observable<String> {
		return reconnectObservable
	}

	fun observeDisconnect(): Observable<Throwable> {
		return disconnectObservable
	}

	fun observeMessage(): Observable<MQTTMessage> {
		return messageObservable
	}

	fun observeDelivery(): Observable<IMqttDeliveryToken> {
		return deliveryObserverable
	}

	private fun addCallbacks() {
		client.setCallback(object: MqttCallbackExtended {
			override fun connectComplete(reconnect: Boolean, serverURI: String?) {
				if(reconnect) {
					onReconnect(serverURI)
				}
				else {
					onConnect(serverURI)
				}
			}

			override fun messageArrived(topic: String?, message: MqttMessage?) {
				onMessageArrived(topic, message)
			}

			override fun connectionLost(cause: Throwable?) {
				onConnectionLost(cause)
			}

			override fun deliveryComplete(token: IMqttDeliveryToken?) {
				onDeliveryComplete(token)
			}
		})
	}

	private fun tryConnect(options: MqttConnectOptions): Boolean {
		try  {
			client.connect(options, null, object: IMqttActionListener {
				override fun onSuccess(asyncActionToken: IMqttToken?) {
					onSuccesfulConnect(asyncActionToken)
				}

				override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
					onFailedConnect(asyncActionToken, exception)
				}
			})

			return true
		}
		catch (ex: MqttException) {
			Log.e(javaClass.simpleName, ex.toString())
			return false
		}
	}

	private fun onReconnect(serverURI: String?) {
		if(serverURI != null) {
			Log.d(javaClass.simpleName, "MQTT Reconnected to $serverURI")
			reconnectEmitter.onNext(serverURI)
		}
	}

	private fun onConnect(serverURI: String?) {
		if(serverURI != null) {
			Log.d(javaClass.simpleName, "MQTT connected to ${serverURI}")
			connectEmitter.onNext(serverURI)
		}
	}

	private fun onMessageArrived(topic: String?, message: MqttMessage?) {
		if(topic != null && message != null) {
			Log.d(javaClass.simpleName, "MQTT Message arrived")
			messageEmitter.onNext(MQTTMessage(topic, message))
		}
	}

	private fun onConnectionLost(cause: Throwable?) {
		if(cause != null) {
			Log.d(javaClass.simpleName, "MQTT Connection lost")
			disconnectEmitter.onNext(cause)
		}
	}

	private fun onDeliveryComplete(token: IMqttDeliveryToken?) {
		if(token != null) {
			Log.d(javaClass.simpleName, "MQTT Delivery complete")
			deliveryEmitter.onNext(token)
		}
	}

	private fun onSuccesfulConnect(asyncActionToken: IMqttToken?) {
		if(asyncActionToken != null) {
			Log.d(javaClass.simpleName, "MQTT Successful connect")
		}
	}

	private fun onFailedConnect(asyncActionToken: IMqttToken?, exception: Throwable?) {
		if(asyncActionToken != null && exception != null) {
			Log.d(javaClass.simpleName, "MQTT failed connect")
			Log.e(javaClass.simpleName, exception.toString())
		}
	}

	data class MQTTMessage(var topic: String?, var message: MqttMessage?)
}