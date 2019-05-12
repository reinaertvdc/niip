package tk.logitrack.logitrackcompanion.LogiTrack

import com.tinder.scarlet.WebSocket
import com.tinder.scarlet.ws.Receive
import com.tinder.scarlet.ws.Send
import io.reactivex.Flowable

interface LogiTrackAPIDefinition {
	@Receive
	fun observeWebSocketEvent(): Flowable<WebSocket.Event>


	@Receive
	fun observeStartDataStream(): Flowable<StandardReply>

	@Receive
	fun observeStopDataStream(): Flowable<StandardReply>

	@Receive
	fun observeListData(): Flowable<StandardReply>

	@Receive
	fun observeGetData(): Flowable<StandardReply>

	@Receive
	fun observeDataStreamTick(): Flowable<StandardReply>

	@Send
	fun sendStartDataStream(startDataStream: StartDataStream)

	@Send
	fun sendStopDataStream(stopDataStream: StopDataStream)

	@Send
	fun sendListData(listData: ListData)

	@Send
	fun sendGetData(getData: GetData)
}

data class StandardReply (
	val type: String,
	val data: MutableMap<String, kotlin.Any> = HashMap()
)

class StartDataStream(sources: List<String>) {
	val type: String = "start-data-stream"
	val data: MutableMap<String, kotlin.Any> = HashMap()

	init {
		data["sources"] = sources
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