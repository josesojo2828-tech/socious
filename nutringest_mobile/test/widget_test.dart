import 'package:flutter_test/flutter_test.dart';
import 'package:nutringest_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const NutringestApp());
    expect(find.text('Nutringest'), findsOneWidget);
  });
}
