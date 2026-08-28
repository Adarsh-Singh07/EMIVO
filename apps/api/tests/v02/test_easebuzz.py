import pytest
from modules.payments.providers.easebuzz import EasebuzzProvider
from modules.payments.models import PaymentProvider

def test_easebuzz_generate_hash():
    provider = EasebuzzProvider(
        merchant_key="test_key",
        salt="test_salt",
        environment="sandbox",
        storefront_url="http://localhost:3000"
    )
    
    # Request hash
    # "key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT"
    h = provider.generate_request_hash(
        txnid="txn123",
        amount="100.00",
        productinfo="test_product",
        firstname="john",
        email="john@example.com",
    )
    assert len(h) == 128  # sha512 length
    
    import hashlib
    expected_str = "test_key|txn123|100.00|test_product|john|john@example.com|||||||||||test_salt"
    expected_hash = hashlib.sha512(expected_str.encode("utf-8")).hexdigest().lower()
    assert h == expected_hash

def test_easebuzz_verify_response_hash():
    provider = EasebuzzProvider(
        merchant_key="test_key",
        salt="test_salt",
        environment="sandbox",
        storefront_url="http://localhost:3000"
    )
    
    # Response hash
    # "SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key"
    import hashlib
    expected_str = "test_salt|success|||||||||||john@example.com|john|test_product|100.00|txn123|test_key"
    h = hashlib.sha512(expected_str.encode("utf-8")).hexdigest().lower()
    
    is_valid = provider.verify_response_hash(
        status="success",
        txnid="txn123",
        amount="100.00",
        productinfo="test_product",
        firstname="john",
        email="john@example.com",
        received_hash=h
    )
    assert is_valid is True

    # Tampered amount
    is_valid = provider.verify_response_hash(
        status="success",
        txnid="txn123",
        amount="100.01",
        productinfo="test_product",
        firstname="john",
        email="john@example.com",
        received_hash=h
    )
    assert is_valid is False

def test_easebuzz_verify_callback_hash():
    provider = EasebuzzProvider(
        merchant_key="test_key",
        salt="test_salt",
        environment="sandbox",
        storefront_url="http://localhost:3000"
    )
    
    import hashlib
    expected_str = "test_salt|success|||||||||||john@example.com|john|test_product|100.00|txn123|test_key"
    h = hashlib.sha512(expected_str.encode("utf-8")).hexdigest().lower()
    
    callback_data = {
        "status": "success",
        "txnid": "txn123",
        "amount": "100.00",
        "productinfo": "test_product",
        "firstname": "john",
        "email": "john@example.com",
        "hash": h
    }
    
    assert provider.verify_callback_hash(callback_data) is True
    
    # Alter the status
    tampered_data = callback_data.copy()
    tampered_data["status"] = "failed"
    assert provider.verify_callback_hash(tampered_data) is False

