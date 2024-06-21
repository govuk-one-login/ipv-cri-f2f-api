import json

def lambda_handler(event, context):
    # Log the received event for debugging purposes
    print("Received event: " + json.dumps(event, indent=2))

    # Extract data from the event if needed
    try:
        data = json.loads(event['body'])
        # Process the data as needed
        response = {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Session processed successfully',
                'input': data
            })
        }
    except Exception as e:
        print(f"Error processing session: {e}")
        response = {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Failed to process session',
                'error': str(e)
            })
        }

    return response
