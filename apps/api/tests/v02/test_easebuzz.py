import pytest
from modules.payments.providers.easebuzz import (
    EasebuzzProvider,
    generate_request_hash,
    verify_response_hash,
)

def test_easebuzz_generate_hash():
    # Request hash
    # "key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT"
    h = generate_request_hash(
        key="test_key",
        txnid="txn123",
        amount="100.00",
        productinfo="test_product",
        firstname="john",
        email="john@example.com",
        salt="test_salt"
    )
    assert len(h) == 128  # sha512 length
    
    import hashlib
    expected_str = "test_key|txn123|100.00|test_product|john|john@example.com|||||||||||test_salt"
    expected_hash = hashlib.sha512(expected_str.encode("utf-8")).hexdigest().lower()
    assert h == expected_hash

def test_easebuzz_verify_response_hash():
    # Response hash
    # "SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key"
    import hashlib
    expected_str = "test_salt|success|||||||||||john@example.com|john|test_product|100.00|txn123|test_key"
    h = hashlib.sha512(expected_str.encode("utf-8")).hexdigest().lower()
    
    is_valid = verify_response_hash(
        key="test_key",
        status="success",
        txnid="txn123",
        amount="100.00",
        productinfo="test_product",
        firstname="john",
        email="john@example.com",
        received_hash=h,
        salt="test_salt"
    )
    assert is_valid is True

    # Tampered amount
    is_valid = verify_response_hash(
        key="test_key",
        status="success",
        txnid="txn123",
        amount="100.01",
        productinfo="test_product",
        firstname="john",
        email="john@example.com",
        received_hash=h,
        salt="test_salt"
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
        "hash": h,
        "key": "test_key"
    }
    
    assert provider.verify_callback_hash(callback_data) is True
    
    # Alter the status
    tampered_data = callback_data.copy()
    tampered_data["status"] = "failed"
    assert provider.verify_callback_hash(tampered_data) is False

