package tk.logitrack.logitrackcompanion.LogiTrack

import com.tinder.scarlet.WebSocket
import com.tinder.scarlet.ws.Receive
import com.tinder.scarlet.ws.Send
import io.reactivex.Flowable

interface NodeAPIDefinition {
	@Receive
	fun observeWebSocketEvent(): Flowable<WebSocket.Event>

	@Receive
	fun observeReply(): Flowable<StandardReply>

	@Send
	fun sendStartDataStream(startDataStream: StartDataStream)

	@Send
	fun sendStopDataStream(stopDataStream: StopDataStream)

	@Send
	fun sendListData(listData: ListData)

	@Send
	fun sendGetData(getData: GetData)

	@Send
	fun sendAdvertiseData(advertiseData: AdvertiseData)

	@Send
	fun sendProvideData(provideData: ProvideData)

	@Send
	fun sendMQTTForward(mqttForward: MQTTForward)

	@Send
	fun sendAdvertiseMQTTForwarder(mqttFowardAdvertisement: MQTTForwardAdvertisement)

	@Send
	fun sendStartMQTT(startMQTT: StartMQTT)

	@Send
	fun sendStopMQTT(stopMQTT: StopMQTT)
}

data class StandardReply (
	val type: String,
	val data: MutableMap<String, kotlin.Any> = HashMap()
)

class StartMQTT {
	val type: String = "start-mqtt"
	val data: MutableMap<String, kotlin.Any> = HashMap()
}

class StopMQTT {
	val type: String = "stop-mqtt"
	val data: MutableMap<String, kotlin.Any> = HashMap()
}

class MQTTForwardAdvertisement {
	val type: String = "advertise-mqtt-forward"
	val data: MutableMap<String, kotlin.Any> = HashMap()
}

class AdvertiseData(eventName: String, dataKey: String) {
	val type: String = "advertise-data"
	val data: MutableMap<String, kotlin.Any> = HashMap()

	init {
		data["event"] = eventName
		data["key"] = dataKey
	}
}

class ProvideData(val data: MutableMap<String, kotlin.Any>) {
	val type: String = "provide-data"
}

class MQTTForward(val mqttData: String) {
	val type: String = "mqtt-forward"
	val data: MutableMap<String, kotlin.Any> = HashMap()

	init {
		data["data"] = mqttData
	}
}

class StartDataStream(sources: List<String>, interval: Int) {
	val type: String = "start-data-stream"
	val data: MutableMap<String, kotlin.Any> = HashMap()

	init {
		data["sources"] = sources
		data["interval"] = interval
	}
}

class StopDataStream(uuid: String) {
	val type: String = "stop-data-stream"
	val data: MutableMap<String, kotlin.Any> = HashMap()

	init {
		data["uuid"] = uuid
	}
}

class ListData {
	val type: String = "list-data"
	val data: MutableMap<String, kotlin.Any> = HashMap()
}

class GetData(sources: List<String>) {
	val type: String = "get-data"
	val data: MutableMap<String, kotlin.Any> = HashMap()

	init {
		data["sources"] = sources
	}
}