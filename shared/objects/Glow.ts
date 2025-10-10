export class Glow {
  className: string = "glow";
  public Color: string = "red";
  public Blur: number = 20;
  public OffsetX: number = 0;
  public OffsetY: number = 0;
  public blendMode: GlobalCompositeOperation = "source-over";

  constructor(params: Partial<Glow>) {
    Object.assign(this, params);
  }
}
