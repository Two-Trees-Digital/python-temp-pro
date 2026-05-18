/**
 * AWS provider
 *
 * Provisions an EC2 instance ready for the turbo-temp stack:
 *   - Ubuntu 22.04 LTS
 *   - t3.small (good default for early-stage apps)
 *   - Security group with ports 22, 80, 443, 3000, 3001, 4000 open
 *   - New key pair created (private key returned once, not stored in AWS)
 *   - User-data script installs: Node 22, pnpm, pm2, git
 *
 * Requires env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 */

import {
  EC2Client,
  CreateKeyPairCommand,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
  RunInstancesCommand,
  DescribeInstancesCommand,
  waitUntilInstanceRunning,
} from "@aws-sdk/client-ec2";

// Ubuntu 22.04 LTS AMI IDs by region (update periodically)
const UBUNTU_AMIS = {
  "us-east-1": "ami-0c7217cdde317cfec",
  "us-east-2": "ami-05fb0b8c1424f266b",
  "us-west-1": "ami-0ce2cb35386fc22e9",
  "us-west-2": "ami-008fe2fc65df48dac",
  "eu-west-1": "ami-0905a3c97561e0b69",
  "eu-central-1": "ami-0faab6bdbac9486fb",
  "ap-southeast-1": "ami-0df7a207adb9748c7",
  "ap-northeast-1": "ami-0d52744d6551d851e",
};

const INSTANCE_TYPE = "t3.small";

/**
 * @param {object} opts
 * @param {string} opts.projectName
 * @returns {Promise<{ instanceId: string, publicIp: string, privateKey: string }>}
 */
export async function provisionEC2({ projectName }) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set for EC2 provisioning"
    );
  }

  const region = process.env.AWS_REGION || "us-east-2";
  const client = new EC2Client({ region });

  // 1. Create key pair
  const keyName = `${projectName}-key`;
  const { KeyMaterial: privateKey } = await client.send(
    new CreateKeyPairCommand({ KeyName: keyName, KeyType: "rsa" })
  );

  // 2. Create security group
  const sgName = `${projectName}-sg`;
  let sgId;
  try {
    const { GroupId } = await client.send(
      new CreateSecurityGroupCommand({
        GroupName: sgName,
        Description: `Security group for ${projectName}`,
      })
    );
    sgId = GroupId;
  } catch (err) {
    // If it already exists, look it up
    if (err.Code === "InvalidGroup.Duplicate") {
      throw new Error(
        `Security group "${sgName}" already exists. Choose a different project name or delete it first.`
      );
    }
    throw err;
  }

  // 3. Open required ports
  await client.send(
    new AuthorizeSecurityGroupIngressCommand({
      GroupId: sgId,
      IpPermissions: [22, 80, 443, 3000, 3001, 4000].map((port) => ({
        IpProtocol: "tcp",
        FromPort: port,
        ToPort: port,
        IpRanges: [{ CidrIp: "0.0.0.0/0" }],
      })),
    })
  );

  // 4. Launch instance
  const ami = UBUNTU_AMIS[region] || UBUNTU_AMIS["us-east-2"];
  const userData = Buffer.from(BOOTSTRAP_SCRIPT).toString("base64");

  const { Instances } = await client.send(
    new RunInstancesCommand({
      ImageId: ami,
      InstanceType: INSTANCE_TYPE,
      KeyName: keyName,
      SecurityGroupIds: [sgId],
      MinCount: 1,
      MaxCount: 1,
      UserData: userData,
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            { Key: "Name", Value: projectName },
            { Key: "Project", Value: projectName },
            { Key: "ManagedBy", Value: "turbo-temp-bootstrap" },
          ],
        },
      ],
    })
  );

  const instanceId = Instances[0].InstanceId;

  // 5. Wait for the instance to reach "running" state
  await waitUntilInstanceRunning(
    { client, maxWaitTime: 120 },
    { InstanceIds: [instanceId] }
  );

  // 6. Fetch public IP
  const { Reservations } = await client.send(
    new DescribeInstancesCommand({ InstanceIds: [instanceId] })
  );
  const publicIp = Reservations[0].Instances[0].PublicIpAddress;

  return { instanceId, publicIp, privateKey };
}

// ─── Bootstrap script (runs as root on first boot via cloud-init) ─────────────

const BOOTSTRAP_SCRIPT = `#!/bin/bash
set -e

# Update system
apt-get update -y && apt-get upgrade -y

# Install Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git

# Install pnpm globally
npm install -g pnpm@8 pm2

# Allow pnpm to run without sudo for the ubuntu user
su - ubuntu -c "pnpm setup"

# Create app directory
mkdir -p /home/ubuntu/app
chown ubuntu:ubuntu /home/ubuntu/app

echo "Bootstrap complete. Node: $(node -v), pnpm: $(pnpm -v)" >> /var/log/bootstrap.log
`;
