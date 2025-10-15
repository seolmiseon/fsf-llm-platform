"""
Firebase Admin SDK 초기화 및 헬퍼 함수
"""
import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
import json
import base64
import logging

logger = logging.getLogger(__name__)

# Firebase 인스턴스 저장용 전역 변수
_firebase_app = None
_firestore_db = None

def initialize_firebase():
    """Firebase Admin SDK 초기화"""
    global _firebase_app, _firestore_db
    
    if firebase_admin._apps:
        logger.info("Firebase가 이미 초기화되어 있습니다.")
        return
    
    cred = None
    
    try:
        # 1순위: Base64 인코딩된 환경변수 (Cloud Run용)
        firebase_base64 = os.getenv('FIREBASE_SERVICE_ACCOUNT_BASE64')
        if firebase_base64:
            try:
                decoded = base64.b64decode(firebase_base64)
                service_account_info = json.loads(decoded)
                cred = credentials.Certificate(service_account_info)
                logger.info("✅ Firebase Base64 환경변수에서 인증정보 로드 성공")
            except Exception as e:
                logger.warning(f"⚠️ Firebase Base64 환경변수 파싱 실패: {e}")
        
        # 2순위: JSON 문자열 환경변수
        if not cred:
            firebase_key = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
            if firebase_key:
                try:
                    service_account_info = json.loads(firebase_key)
                    cred = credentials.Certificate(service_account_info)
                    logger.info("✅ Firebase JSON 환경변수에서 인증정보 로드 성공")
                except json.JSONDecodeError as e:
                    logger.warning(f"⚠️ Firebase JSON 환경변수 파싱 실패: {e}")
        
        # 3순위: 파일 경로 환경변수
        if not cred:
            firebase_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            if firebase_path and os.path.exists(firebase_path):
                cred = credentials.Certificate(firebase_path)
                logger.info(f"✅ Firebase 파일에서 인증정보 로드 성공: {firebase_path}")
        
        # 4순위: 로컬 파일 (개발용)
        if not cred:
            service_account_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'serviceAccountKey.json'
            )
            if os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                logger.info(f"✅ Firebase 로컬 파일에서 인증정보 로드 성공")
            else:
                logger.warning(
                    f"⚠️ Firebase Service Account 키 파일을 찾을 수 없습니다: {service_account_path}"
                )
        
        # Firebase 앱 초기화
        if cred:
            _firebase_app = firebase_admin.initialize_app(cred)
            _firestore_db = firestore.client()
            logger.info("✅ Firebase Admin SDK 초기화 성공")
        else:
            logger.warning("Firebase 인증정보가 없어 Firebase 기능이 비활성화됩니다.")
            
    except Exception as e:
        logger.error(f"⚠️ Firebase Admin SDK 초기화 실패: {e}")

def get_firebase_auth():
    """Firebase Auth 인스턴스 반환"""
    if not firebase_admin._apps:
        raise Exception("Firebase가 초기화되지 않았습니다.")
    return auth

def get_firestore_db():
    """Firestore DB 인스턴스 반환"""
    global _firestore_db
    if _firestore_db is None:
        if not firebase_admin._apps:
            raise Exception("Firebase가 초기화되지 않았습니다.")
        _firestore_db = firestore.client()
    return _firestore_db

def is_firebase_initialized():
    """Firebase 초기화 여부 확인"""
    return bool(firebase_admin._apps)

