# Android APK Setup Guide

This guide explains how to wrap this web app in an Android WebView APK using Android Studio.

## Prerequisites

- Android Studio (latest)
- Basic Kotlin knowledge (or use Gemini Code in Android Studio)

## Step 1 — Create a new Android project

In Android Studio: File → New → New Project → **Empty Activity** → Kotlin

## Step 2 — Add WebView to your layout

`res/layout/activity_main.xml`:
```xml
<WebView
    android:id="@+id/webView"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

## Step 3 — Full MainActivity.kt

```kotlin
package com.yourapp.musicplayer

import android.Manifest
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // File picker launcher
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        filePathCallback?.onReceiveValue(uris.toTypedArray())
        filePathCallback = null
    }

    // Permission launcher
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* granted or denied — scanner handles gracefully */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Request audio permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionLauncher.launch(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            permissionLauncher.launch(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

        webView = findViewById(R.id.webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mediaPlaybackRequiresUserGesture = false
        }

        // File picker support
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                this@MainActivity.filePathCallback = filePathCallback
                fileChooserLauncher.launch("audio/*")
                return true
            }
        }

        // Music scanner bridge
        webView.addJavascriptInterface(AndroidMusic(this), "AndroidMusic")

        // Load the app (use live URL for auto-updates)
        webView.loadUrl("https://YOUR_REPLIT_URL_HERE")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    // JavaScript bridge — called by web app as window.AndroidMusic.scanAllMusic()
    inner class AndroidMusic(private val context: Context) {
        @JavascriptInterface
        fun scanAllMusic(): String {
            val list = mutableListOf<String>()
            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME
            )
            val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
            val sortOrder = "${MediaStore.Audio.Media.DISPLAY_NAME} ASC"

            context.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection, selection, null, sortOrder
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idCol)
                    val name = cursor.getString(nameCol).replace("\"", "\\\"")
                    val uri = Uri.withAppendedPath(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id.toString()
                    )
                    list.add("""{"name":"$name","uri":"$uri"}""")
                }
            }
            return "[${list.joinToString(",")}]"
        }
    }
}
```

## Step 4 — AndroidManifest.xml permissions

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
```

## Step 5 — Build

1. Replace `YOUR_REPLIT_URL_HERE` with your published Replit URL
2. Build → Generate Signed Bundle/APK → APK
3. Install on your Android device

## Updating the app

If you load a **live URL** (recommended): no APK update needed — the web app updates automatically whenever you push changes.

If you **bundle assets** locally: re-download the project, copy `client/dist/` into `assets/www/`, rebuild APK.
