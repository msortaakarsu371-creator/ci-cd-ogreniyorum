from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pyodbc
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Linked services storage (in production, use a database)
linked_services = []

def test_sql_connection(server_name, database_name, username=None, password=None, trust_certificate=True):
    """
    Test SQL Server connection
    """
    try:
        # Build connection string
        if username and password:
            # SQL Authentication
            conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server_name};DATABASE={database_name};UID={username};PWD={password}"
            if trust_certificate:
                conn_str += ";TrustServerCertificate=yes"
        else:
            # Windows Authentication
            conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server_name};DATABASE={database_name};Trusted_Connection=yes"
            if trust_certificate:
                conn_str += ";TrustServerCertificate=yes"
        
        # Test connection
        conn = pyodbc.connect(conn_str, timeout=5)
        conn.close()
        return True, "Connection successful"
    except Exception as e:
        return False, str(e)

@app.route('/api/linked-services', methods=['GET'])
def get_linked_services():
    """Get all linked services"""
    return jsonify(linked_services)

@app.route('/api/linked-services', methods=['POST'])
def create_linked_service():
    """Create a new linked service"""
    data = request.json
    
    # Validate required fields
    if 'name' not in data:
        return jsonify({'error': 'Missing required field: name'}), 400
    
    service_type = data.get('serviceType', 'db')
    connection_success = False
    connection_message = ''
    
    # Create linked service object
    linked_service = {
        'id': len(linked_services) + 1,
        'name': data['name'],
        'description': data.get('description', ''),
        'serviceType': service_type,
        'createdAt': datetime.now().isoformat()
    }
    
    if service_type == 'db':
        # Validate DB required fields
        if 'serverName' not in data or 'databaseName' not in data:
            return jsonify({'error': 'Missing required fields: serverName, databaseName'}), 400
        
        # Test connection
        username = data.get('username') if data.get('authenticationType') == 'sql' else None
        password = data.get('password') if data.get('authenticationType') == 'sql' else None
        trust_certificate = data.get('trustServerCertificate', True)
        
        connection_success, connection_message = test_sql_connection(
            data['serverName'],
            data['databaseName'],
            username,
            password,
            trust_certificate
        )
        
        linked_service.update({
            'serverName': data['serverName'],
            'databaseName': data['databaseName'],
            'authenticationType': data.get('authenticationType', 'windows'),
            'username': username,
            'password': password,  # In production, encrypt this
            'trustServerCertificate': trust_certificate,
        })
    else:
        # AI API type
        if 'aiApiKey' not in data:
            return jsonify({'error': 'Missing required field: aiApiKey'}), 400
        
        # For AI API, we can't test connection like DB, so mark as success
        connection_success = True
        connection_message = 'AI API Key configured'
        
        linked_service.update({
            'aiApiKey': data['aiApiKey'],  # In production, encrypt this
        })
    
    linked_service['connectionStatus'] = 'success' if connection_success else 'failed'
    linked_service['connectionMessage'] = connection_message
    
    # Initialize events log
    linked_service['events'] = [{
        'timestamp': datetime.now().isoformat(),
        'level': 'INFO',
        'message': f"Service '{linked_service['name']}' created successfully."
    }]
    
    if connection_success:
        linked_service['events'].append({
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'message': f"Connection test passed for '{linked_service['name']}'."
        })
    else:
        linked_service['events'].append({
            'timestamp': datetime.now().isoformat(),
            'level': 'ERROR',
            'message': f"Connection test failed for '{linked_service['name']}': {connection_message}"
        })
    
    linked_services.append(linked_service)
    
    return jsonify(linked_service), 201

@app.route('/api/linked-services/<int:service_id>/test', methods=['POST'])
def test_linked_service(service_id):
    """Test connection for an existing linked service"""
    service = next((s for s in linked_services if s['id'] == service_id), None)
    
    if not service:
        return jsonify({'error': 'Linked service not found'}), 404
    
    username = service.get('username') if service.get('authenticationType') == 'sql' else None
    password = service.get('password') if service.get('authenticationType') == 'sql' else None
    
    connection_success, connection_message = test_sql_connection(
        service['serverName'],
        service['databaseName'],
        username,
        password,
        service.get('trustServerCertificate', True)
    )
    
    # Update connection status
    service['connectionStatus'] = 'success' if connection_success else 'failed'
    service['connectionMessage'] = connection_message
    service['lastTestedAt'] = datetime.now().isoformat()
    
    # Add event log entry
    if 'events' not in service:
        service['events'] = []
    
    service['events'].append({
        'timestamp': datetime.now().isoformat(),
        'level': 'INFO' if connection_success else 'ERROR',
        'message': f"Connection test {'passed' if connection_success else 'failed'} for '{service['name']}': {connection_message}"
    })
    
    return jsonify({
        'success': connection_success,
        'message': connection_message,
        'service': service
    })

@app.route('/api/linked-services/<int:service_id>', methods=['PUT'])
def update_linked_service(service_id):
    """Update an existing linked service"""
    service = next((s for s in linked_services if s['id'] == service_id), None)
    
    if not service:
        return jsonify({'error': 'Linked service not found'}), 404
    
    data = request.json
    
    # Update service fields
    if 'name' in data:
        service['name'] = data['name']
    if 'description' in data:
        service['description'] = data.get('description', '')
    if 'serviceType' in data:
        service['serviceType'] = data['serviceType']
    
    service_type = service.get('serviceType', 'db')
    connection_success = False
    connection_message = ''
    
    if service_type == 'db':
        if 'serverName' in data:
            service['serverName'] = data['serverName']
        if 'databaseName' in data:
            service['databaseName'] = data['databaseName']
        if 'authenticationType' in data:
            service['authenticationType'] = data['authenticationType']
        if 'username' in data:
            service['username'] = data.get('username')
        if 'password' in data:
            service['password'] = data.get('password')
        if 'trustServerCertificate' in data:
            service['trustServerCertificate'] = data['trustServerCertificate']
        
        # Test connection if DB fields are provided
        if 'serverName' in data and 'databaseName' in data:
            username = service.get('username') if service.get('authenticationType') == 'sql' else None
            password = service.get('password') if service.get('authenticationType') == 'sql' else None
            trust_certificate = service.get('trustServerCertificate', True)
            
            connection_success, connection_message = test_sql_connection(
                service['serverName'],
                service['databaseName'],
                username,
                password,
                trust_certificate
            )
            
            service['connectionStatus'] = 'success' if connection_success else 'failed'
            service['connectionMessage'] = connection_message
    else:
        if 'aiApiKey' in data:
            service['aiApiKey'] = data['aiApiKey']
            connection_success = True
            connection_message = 'AI API Key updated'
            service['connectionStatus'] = 'success'
            service['connectionMessage'] = connection_message
    
    # Add event log entry for update
    if 'events' not in service:
        service['events'] = []
    
    service['events'].append({
        'timestamp': datetime.now().isoformat(),
        'level': 'INFO',
        'message': f"Service '{service['name']}' configuration updated."
    })
    
    if connection_success:
        service['events'].append({
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'message': f"Connection test passed for '{service['name']}'."
        })
    elif connection_message:
        service['events'].append({
            'timestamp': datetime.now().isoformat(),
            'level': 'ERROR',
            'message': f"Connection test failed for '{service['name']}': {connection_message}"
        })
    
    return jsonify(service), 200

@app.route('/api/linked-services/<int:service_id>', methods=['DELETE'])
def delete_linked_service(service_id):
    """Delete a linked service"""
    global linked_services
    linked_services = [s for s in linked_services if s['id'] != service_id]
    return jsonify({'message': 'Linked service deleted'}), 200

@app.route('/api/python/execute', methods=['POST'])
def execute_python_code():
    """Execute Python code and return results"""
    try:
        data = request.json
        code = data.get('code', '')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        # Import necessary libraries
        import subprocess
        import sys
        import os
        import tempfile
        import base64
        from io import StringIO
        
        # Create a temporary file for the Python code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Execute Python code
            result = subprocess.run(
                [sys.executable, temp_file],
                capture_output=True,
                text=True,
                timeout=30,  # 30 second timeout
                cwd=os.path.dirname(temp_file)
            )
            
            output = result.stdout
            error = result.stderr
            
            # Check if matplotlib figure was created (save it)
            # This is a simplified approach - in production, use proper image capture
            response_data = {
                'success': result.returncode == 0,
                'output': output,
                'error': error if result.returncode != 0 else None
            }
            
            return jsonify(response_data)
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file):
                os.unlink(temp_file)
                
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Code execution timeout (30 seconds)'}), 408
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)

