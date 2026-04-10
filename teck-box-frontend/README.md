#  for docker backend
docker build -t teck-box-backend .
docker tag teck-box-backend:latest 032190965304.dkr.ecr.us-east-1.amazonaws.com/teck-box-backend:latest
docker push 032190965304.dkr.ecr.us-east-1.amazonaws.com/teck-box-backend:latest  
aws ecs update-service --cluster TeckBoxCluster --service teckbox-service-v2 --force-new-deployment


# for frontend test
npm run dev

# for backend test
node index.js


# note
 npm install xxx --legacy-peer-deps