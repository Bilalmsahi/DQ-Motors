import { useEffect, useRef, useState } from 'react';

const ScrollReveal = ({ 
  children, 
  direction = 'up', // 'up', 'down', 'left', 'right', 'fade'
  delay = 0,
  duration = 700,
  distance = 60,
  threshold = 0.1,
  once = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && currentRef) {
            observer.unobserve(currentRef);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, once]);

  // Calculate initial transform based on direction
  const getInitialTransform = () => {
    switch (direction) {
      case 'up':
        return `translateY(${distance}px) translateZ(0)`;
      case 'down':
        return `translateY(-${distance}px) translateZ(0)`;
      case 'left':
        return `translateX(${distance}px) translateZ(0)`;
      case 'right':
        return `translateX(-${distance}px) translateZ(0)`;
      case 'fade':
      default:
        return 'translateY(0) translateZ(0)';
    }
  };

  const style = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0) translateX(0) translateZ(0)' : getInitialTransform(),
    transition: `opacity ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
    willChange: 'opacity, transform'
  };

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
};

// Stagger children animation wrapper
export const StaggerReveal = ({ 
  children, 
  staggerDelay = 100,
  direction = 'up',
  duration = 700,
  distance = 40,
  threshold = 0.1,
  once = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && currentRef) {
            observer.unobserve(currentRef);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  const getInitialTransform = () => {
    switch (direction) {
      case 'up':
        return `translateY(${distance}px) translateZ(0)`;
      case 'down':
        return `translateY(-${distance}px) translateZ(0)`;
      case 'left':
        return `translateX(${distance}px) translateZ(0)`;
      case 'right':
        return `translateX(-${distance}px) translateZ(0)`;
      default:
        return 'translateY(0) translateZ(0)';
    }
  };

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children) ? children.map((child, index) => (
        <div
          key={index}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0) translateX(0) translateZ(0)' : getInitialTransform(),
            transition: `opacity ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * staggerDelay}ms, transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * staggerDelay}ms`,
            willChange: 'opacity, transform'
          }}
        >
          {child}
        </div>
      )) : children}
    </div>
  );
};

export default ScrollReveal;
