"use client";
import { Component, type ReactNode } from "react";

export class MapBoundary extends Component<
  { children: ReactNode; onShowList: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="map-fallback" role="status">
          <p>Harita şu anda açılamıyor.</p>
          <span>Eczanelerin adres ve yol tarifine listeden ulaşabilirsin.</span>
          <button onClick={this.props.onShowList}>Listeyi göster</button>
        </div>
      );
    return <div className="map-boundary">{this.props.children}</div>;
  }
}
