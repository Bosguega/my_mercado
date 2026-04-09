import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import UniversalSearchBar from "./UniversalSearchBar";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("UniversalSearchBar", () => {
  function renderComponent(props: {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
  }) {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);
    const onChangeSpy = props.onChange ?? vi.fn();

    act(() => {
      root.render(
        <UniversalSearchBar
          placeholder={props.placeholder}
          value={props.value ?? ""}
          onChange={onChangeSpy}
        />,
      );
    });

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).not.toBeNull();

    return {
      input,
      container,
      root,
      onChange: onChangeSpy,
    };
  }

  it("deve renderizar o input com placeholder idle padrao", () => {
    const { input } = renderComponent({});
    expect(input.placeholder).toBe("Pesquisar por nome ou categoria");
  });

  it("deve usar placeholder customizado quando fornecido", () => {
    const { input } = renderComponent({ placeholder: "Buscar por mercado..." });
    expect(input.placeholder).toBe("Buscar por mercado...");
  });

  it("deve mudar placeholder para dica de sintaxe ao focar", () => {
    const { input, root, container } = renderComponent({});

    act(() => {
      input.focus();
    });

    expect(input.placeholder).toBe("Use espaço para separar termos e - para excluir");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("deve voltar ao placeholder idle ao perder o foco", () => {
    const { input, root, container } = renderComponent({});

    act(() => {
      input.focus();
    });
    expect(input.placeholder).toBe("Use espaço para separar termos e - para excluir");

    act(() => {
      input.blur();
    });
    expect(input.placeholder).toBe("Pesquisar por nome ou categoria");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("deve respeitar placeholder customizado ao perder o foco", () => {
    const { input, root, container } = renderComponent({
      placeholder: "Buscar por mercado...",
    });

    act(() => {
      input.focus();
    });
    expect(input.placeholder).toBe("Use espaço para separar termos e - para excluir");

    act(() => {
      input.blur();
    });
    expect(input.placeholder).toBe("Buscar por mercado...");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("nao deve alterar o valor digitado ao focar/desfocar", () => {
    const onChange = vi.fn();
    const { input, root, container } = renderComponent({ value: "leite", onChange });

    act(() => {
      input.focus();
    });
    act(() => {
      input.blur();
    });

    expect(input.value).toBe("leite");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("deve chamar onChange ao digitar", () => {
    const onChange = vi.fn();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Wrapper(props: { value: string; onChange: (v: string) => void }) {
      return (
        <UniversalSearchBar
          value={props.value}
          onChange={props.onChange}
        />
      );
    }

    act(() => {
      root.render(<Wrapper value="" onChange={onChange} />);
    });

    const input = container.querySelector("input") as HTMLInputElement;

    // Simular input via React re-render com valor atualizado
    // (Em teste real, o onChange atualiza o estado do pai que faz re-render)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;

    act(() => {
      nativeInputValueSetter?.call(input, "leite -doce");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith("leite -doce");

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
