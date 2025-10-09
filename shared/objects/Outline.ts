export class Outline {
  strokeStyle: string = "black";

  constructor(params: Partial<Outline>) {
    Object.assign(this, params);
  }
}
