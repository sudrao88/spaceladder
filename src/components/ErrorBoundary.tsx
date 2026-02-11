import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050510] text-white gap-4">
          <p className="text-xl font-bold text-red-400">
            Something went wrong with the 3D renderer.
          </p>
          <p className="text-gray-400 text-sm max-w-md text-center">
            This can happen if your device ran out of GPU memory or the browser
            lost the WebGL context.
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-cyan-700 hover:bg-cyan-600 rounded text-white font-bold transition-colors"
          >
            Reload Game
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
