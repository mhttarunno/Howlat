import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

class ApiClient {
  // 10.0.2.2 points to host localhost in Android Emulator
  // For physical devices over Wi-Fi, set to your computer's local IP (e.g. 192.168.x.x)
  static const String defaultBaseUrl = 'http://10.0.2.2:8000/api/v1';

  final Dio dio;
  final FlutterSecureStorage storage = const FlutterSecureStorage();
  final Uuid uuid = const Uuid();

  ApiClient({String baseUrl = defaultBaseUrl})
      : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            headers: {'Accept': 'application/json'},
          ),
        ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // 1. Attach Bearer token from hardware keystore
          final token = await storage.read(key: 'howlat_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          // 2. Attach unique Idempotency-Key on mutations
          if (['POST', 'PATCH', 'DELETE'].contains(options.method.toUpperCase())) {
            options.headers['Idempotency-Key'] = uuid.v4();
          }

          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            // Token expired or invalidated via token_version
            await storage.delete(key: 'howlat_token');
          }
          return handler.next(error);
        },
      ),
    );
  }
}
