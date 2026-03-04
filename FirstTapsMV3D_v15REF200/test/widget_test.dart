// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:three_js_file_viewer/main.dart';
import 'package:three_js_file_viewer/sms/sms_channel_manager.dart';

void main() {
  testWidgets('WindowWorld 3D app smoke test', (WidgetTester tester) async {
    // Create a mock SMS channel manager for testing
    final smsChannelManager = SmsChannelManager();

    // Build our app and trigger a frame.
    await tester.pumpWidget(
      WindowWorldApp(smsChannelManager: smsChannelManager),
    );

    // Verify that the app loads without errors
    expect(find.byType(MaterialApp), findsOneWidget);

    // Allow the app to settle
    await tester.pumpAndSettle();

    // Check if we can find the main UI elements
    expect(find.byType(Scaffold), findsOneWidget);
  });
}
