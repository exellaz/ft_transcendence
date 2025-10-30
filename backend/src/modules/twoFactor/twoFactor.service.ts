import { Authenticator } from "@otplib/core";
import { keyDecoder, keyEncoder } from "@otplib/plugin-thirty-two";
import { createDigest, createRandomBytes } from "@otplib/plugin-crypto";
import qrcode from "qrcode";

const authenticator = new Authenticator({
  createDigest,
  createRandomBytes,
  keyDecoder,
  keyEncoder,
});

export class TwoFactorService {
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  static async generateQRCodeUri(
    username: string,
    secret: string,
  ): Promise<string> {
    const serviceName = "ft_transcendence";
    const otpAuthUrl = authenticator.keyuri(username, serviceName, secret);

    return qrcode.toDataURL(otpAuthUrl);
  }

  static verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.check(token, secret);
    } catch {
      return false;
    }
  }

  static generateToken(secret: string): string {
    return authenticator.generate(secret);
  }
}
