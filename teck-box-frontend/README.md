#  for docker backend
docker tag teck-box-backend:latest 032190965304.dkr.ecr.us-east-1.amazonaws.com/teck-box-backend:latest
docker push 032190965304.dkr.ecr.us-east-1.amazonaws.com/teck-box-backend:latest  
aws ecs update-service --cluster TeckBoxCluster --service teck-box-backend --force-new-deployment