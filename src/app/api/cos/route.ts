import { NextResponse } from 'next/server';
import STS from 'qcloud-cos-sts';

// 腾讯云配置
const config = {
  secretId: process.env.COS_SECRET_ID!,
  secretKey: process.env.COS_SECRET_KEY!,
  proxy: '',
  durationSeconds: 1800, // 30分钟有效
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION,
  allowPrefix: '*', 
  allowActions: [
    'name/cos:PutObject',
    'name/cos:PostObject',
    'name/cos:InitiateMultipartUpload',
    'name/cos:ListMultipartUploads',
    'name/cos:ListParts',
    'name/cos:UploadPart',
    'name/cos:CompleteMultipartUpload',
  ],
};

export async function GET() {
  const scope = config.allowActions;
  const policy = {
    'version': '2.0',
    'statement': [{
      'action': scope,
      'effect': 'allow',
      'principal': {'qcs': ['*']},
      'resource': [
        `qcs::cos:${config.region}:uid/*:${config.bucket}/*`
      ],
    }],
  };

  // 修复点：添加 <NextResponse> 泛型，并给回调参数加上 any 类型防止隐式报错
  return new Promise<NextResponse>((resolve) => {
    STS.getCredential({
      secretId: config.secretId,
      secretKey: config.secretKey,
      policy: policy,
      durationSeconds: config.durationSeconds,
    }, (err: any, tempKeys: any) => {
      if (err) {
        console.error(err);
        resolve(NextResponse.json({ error: 'COS STS Error' }, { status: 500 }));
      } else {
        resolve(NextResponse.json(tempKeys));
      }
    });
  });
}
