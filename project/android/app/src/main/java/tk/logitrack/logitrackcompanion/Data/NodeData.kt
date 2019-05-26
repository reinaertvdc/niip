package tk.logitrack.logitrackcompanion.Data

import com.squareup.moshi.Json

data class NodeData(@field:Json(name = "ssid") val ssid: String,
                    @field:Json(name = "psk") val psk: String,
                    @field:Json(name = "id") val id: String,
                    @field:Json(name = "key") val key: String)