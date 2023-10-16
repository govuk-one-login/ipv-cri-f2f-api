#!/bin/bash

function delete_bucket() {
    local bucket_name="$1"

    # Check if the S3 bucket exists
    if aws s3api head-bucket --bucket "$bucket_name" 2>/dev/null; then
        echo "Bucket '$bucket_name' exists."

        # Delete all versions of objects and delete markers
        echo "Emptying the contents of '$bucket_name'..."

        # Delete all current versions of objects
        aws s3 rm "s3://$bucket_name" --recursive

        # Delete all previous versions of objects and delete markers
        aws s3api list-object-versions --bucket "$bucket_name" | \
        jq -r '.Versions[] | "\(.Key) \(.VersionId)"' | \
        while read key versionId; do
            echo "Deleting $key (version $versionId) from '$bucket_name'"
            aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$versionId"
        done

        # Delete delete markers
        aws s3api list-object-versions --bucket "$bucket_name" | \
        jq -r '.DeleteMarkers[] | "\(.Key) \(.VersionId)"' | \
        while read key versionId; do
            echo "Deleting delete marker for $key (version $versionId) from '$bucket_name'"
            aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$versionId"
        done

        # Delete the bucket
        if aws s3api delete-bucket --bucket "$bucket_name"; then
            echo "Bucket '$bucket_name' deleted."
        else
            echo "Failed to delete bucket '$bucket_name'. It might still have contents."
        fi

    else
        echo "Bucket '$bucket_name' does not exist."
    fi
}

# Check if at least one bucket_name argument was provided
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <bucket_name1> <bucket_name2> ... <bucket_nameN>"
    exit 1
fi

# Iterate over all bucket names and delete them in parallel
for bucket in "$@"; do
    delete_bucket "$bucket" &
done

# Wait for all background processes to complete
wait
