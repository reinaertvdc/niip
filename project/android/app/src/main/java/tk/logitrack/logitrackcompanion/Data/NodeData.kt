package tk.logitrack.logitrackcompanion.Data

import com.squareup.moshi.Json

data class NodeData(@field:Json(name = "ssid") val ssid: String,
                    @field:Json(name = "psk") val psk: String)