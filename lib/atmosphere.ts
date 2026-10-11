import * as T from "three";
import type { Weather } from "./terrain";

export class Atmosphere {
  object: T.Points | T.LineSegments | null = null;
  weather: Weather | null = null;
  constructor(public scene: T.Scene) {}
  set(weather: Weather) {
    this.dispose();
    this.weather = weather;
    if (weather.type !== "snow" && weather.type !== "rain") return;
    const count = Math.round(300 + weather.intensity * 1300);
    const rain = weather.type === "rain",
      positions = new Float32Array(count * (rain ? 6 : 3));
    for (let i = 0; i < positions.length; i += rain ? 6 : 3) {
      positions[i] = Math.random() * 60 - 30;
      positions[i + 1] = Math.random() * 32 - 3;
      positions[i + 2] = Math.random() * 60 - 30;
      if (rain) {
        positions[i + 3] = positions[i];
        positions[i + 4] = positions[i + 1] + 0.5;
        positions[i + 5] = positions[i + 2];
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(positions, 3));
    this.object = rain
      ? new T.LineSegments(
          geo,
          new T.LineBasicMaterial({
            color: "#bdd8ec",
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }),
        )
      : new T.Points(
          geo,
          new T.PointsMaterial({
            color: "#ffffff",
            size: 0.115,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
          }),
        );
    this.object.frustumCulled = false;
    this.scene.add(this.object);
  }
  tick(dt: number, time: number) {
    if (!this.object || !this.weather) return;
    const p = this.object.geometry.attributes.position;
    const rain = this.weather.type === "rain";
    for (let i = 0; i < p.count; i += rain ? 2 : 1) {
      let x =
        p.getX(i) +
        (this.weather.wind * 4 + (rain ? 0 : Math.sin(time + i) * 0.3)) * dt;
      let y = p.getY(i) - dt * (rain ? 16 : 1.7);
      if (y < -3) y = 29;
      if (x > 30) x = -30;
      if (x < -30) x = 30;
      p.setXY(i, x, y);
      if (rain) p.setXY(i + 1, x - this.weather.wind * 0.12, y + 0.55);
    }
    p.needsUpdate = true;
  }
  dispose() {
    if (!this.object) return;
    this.scene.remove(this.object);
    this.object.geometry.dispose();
    (this.object.material as T.Material).dispose();
    this.object = null;
  }
}
